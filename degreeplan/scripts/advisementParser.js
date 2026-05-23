function normalizeLine(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function isBlank(line) {
  return !line || !line.trim();
}

function parseNumber(value) {
  if (value == null) return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function unique(arr) {
  return [...new Set(arr)];
}

function parseStudentHeader(lines) {
  const joined = lines.join('\n');
  const m = joined.match(/For\s+(.+?)\s+\((\d+)\)\s+prepared on\s+(\d{2}\/\d{2}\/\d{4})/);

  if (!m) {
    return { name: null, studentId: null, preparedOn: null };
  }

  return {
    name: m[1].trim(),
    studentId: m[2].trim(),
    preparedOn: m[3].trim()
  };
}

function parseAcademicSummary(lines) {
  const headerLines = lines.slice(0, 32);

  const result = {
    overallCareer: null,
    majorCareer: null
  };

  for (let i = 0; i < headerLines.length; i++) {
    const line = headerLines[i];

    let m = line.match(/^Undergraduate Career(\d+\.\d{3})(\d+\.\d{3})$/);
    if (m) {
      result.overallCareer = {
        academicLevel: 'Undergraduate Career',
        requiredGpa: parseNumber(m[1]),
        actualGpa: parseNumber(m[2]),
        status: headerLines[i + 1] || null,
        requirementTerm: headerLines[i + 2] || null
      };
      continue;
    }

    m = line.match(/^Computer Science Major \(BS\)(\d+\.\d{3})$/);
    if (m) {
      result.majorCareer = {
        academicLevel: 'Computer Science Major (BS)',
        requiredGpa: parseNumber(m[1]),
        actualGpa: parseNumber(headerLines[i + 1]),
        status: headerLines[i + 2] || null,
        requirementTerm: headerLines[i + 3] || null
      };
    }
  }

  return result;
}
  
function parseUnitSummary(lines) {
  const headerLines = lines.slice(0, 32);

  const result = {
    unitsRequiredForDegree: null,
    upperDivisionUnits: null,
    unitsInResidence: null,
    upperDivisionUnitsInResidence: null
  };

  function parsePackedUnitLine(line, label, nextLine) {
    let rest = line.slice(label.length).trim();

    let status = nextLine || null;

    if (rest.endsWith('Satisfied')) {
      status = 'Satisfied';
      rest = rest.replace(/Satisfied$/, '').trim();
    } else if (rest.endsWith('Not Satisfied')) {
      status = 'Not Satisfied';
      rest = rest.replace(/Not Satisfied$/, '').trim();
    }

    const m = rest.match(/^(\d+\.\d{2})(\d+\.\d{2})(\d+\.\d{3})$/);
    if (!m) return null;

    return {
      label,
      requiredUnits: parseNumber(m[1]),
      totalUnits: parseNumber(m[2]),
      inProgressUnits: parseNumber(m[3]),
      status
    };
  }

  for (let i = 0; i < headerLines.length; i++) {
    const line = headerLines[i];

    if (line.startsWith('Units Required for this Degree')) {
      result.unitsRequiredForDegree =
        parsePackedUnitLine(line, 'Units Required for this Degree', headerLines[i + 1]);
    }

    if (line.startsWith('Upper Division Units ') && !line.startsWith('Upper Division Units in Residence')) {
      result.upperDivisionUnits =
        parsePackedUnitLine(line, 'Upper Division Units', headerLines[i + 1]);
    }

    if (line.startsWith('Units in Residence')) {
      result.unitsInResidence =
        parsePackedUnitLine(line, 'Units in Residence', headerLines[i + 1]);
    }

    if (line.startsWith('Upper Division Units in Residence')) {
      result.upperDivisionUnitsInResidence =
        parsePackedUnitLine(line, 'Upper Division Units in Residence', headerLines[i + 1]);
    }
  }

  return result;
}

function cleanupLines(text) {
    return text
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter(line =>
        line &&
        !/^Page \d+ of \d+$/i.test(line) &&
        !/^<IMAGE FOR PAGE:/i.test(line) &&
        !/^\d{8}$/.test(line) &&
        !/^(Mustafa Abushwareb|Elbaraa Abdalla)$/.test(line)
      );
  }

function isRequirementHeader(line) {
  return /^(?:\d+\.\s+)?(.+?)\s+\((R\d+(?:\/L\d+)?|RG\d+)\)$/.test(line);
}

function parseRequirementHeader(line) {
  const m = line.match(/^(?:(\d+)\.\s+)?(.+?)\s+\((R\d+(?:\/L\d+)?|RG\d+)\)$/);
  if (!m) return null;

  return {
    orderPrefix: m[1] ? Number(m[1]) : null,
    title: m[2].trim(),
    code: m[3].trim()
  };
}

function parseStatusLine(line) {
  const m = line.match(/^(Satisfied|Not Satisfied):\s*(.*)$/i);
  if (!m) return null;

  return {
    status: m[1].toLowerCase().replace(/\s+/g, '_'),
    detail: m[2].trim() || null
  };
}

function parseMetricLine(line) {
    let m = line.match(/^·\s*Courses:\s*([\d.]+)\s*required,\s*([\d.]+)\s*completed(?:,\s*([\d.]+)\s*needed)?$/i);
    if (m) {
      return {
        metricType: 'courses',
        required: parseNumber(m[1]),
        completed: parseNumber(m[2]),
        needed: parseNumber(m[3])
      };
    }
  
    m = line.match(/^·\s*Units:\s*([\d.]+)\s*required,\s*([\d.]+)\s*completed(?:,\s*([\d.]+)\s*needed)?$/i);
    if (m) {
      return {
        metricType: 'units',
        required: parseNumber(m[1]),
        completed: parseNumber(m[2]),
        needed: parseNumber(m[3])
      };
    }
  
    m = line.match(/^·\s*GPA:\s*([\d.]+)\s*required,\s*([\d.]+)\s*completed$/i);
    if (m) {
      return {
        metricType: 'gpa',
        required: parseNumber(m[1]),
        completed: parseNumber(m[2]),
        needed: null
      };
    }
  
    return null;
}

function isCourseTableHeader(line) {
  return /^Term Subject Catalog Nbr/.test(line);
}

function parseCourseRow(line) {
    const termMatch = line.match(/^(Fall|Sprg|Sum|Summer|Winter)\s*(\d{4})/);
    if (!termMatch) return null;
  
    const term = `${termMatch[1]} ${termMatch[2]}`;
    let rest = line.slice(termMatch[0].length).trim();
  
    const subjectMatch = rest.match(/^([A-Z]{2,})/);
    if (!subjectMatch) return null;
    const subject = subjectMatch[1];
    rest = rest.slice(subject.length).trim();
  
    // Catalog number:
    // 101, 122A, 160D1, 474A, etc.
    // Stop as soon as we hit a title-like uppercase+lowercase word.
    const catalogMatch = rest.match(/^(\d{3}[A-Z]?(?:\d)?[A-Z]?)(?=[A-Z][a-z]|-|\s)/);
    if (!catalogMatch) return null;
  
    const catalogNumber = catalogMatch[1];
    rest = rest.slice(catalogNumber.length).trim();
  
    const endMatch = rest.match(/(A[+-]?|B[+-]?|C[+-]?|D[+-]?|E|P|W|IP)?\s*([\d.]+)\s*([A-Z0-9]{2,5})?\s*(EN|IP|TR|TE)$/);
    if (!endMatch) return null;
  
    const grade = endMatch[1] || null;
    const units = parseNumber(endMatch[2]);
    const maybeCode = endMatch[3] || null;
    const creditType = endMatch[4];
  
    let title = rest.slice(0, endMatch.index).trim();
    if (!title) return null;
  
    let rptCode = null;
    let requirementDesignation = null;
  
    if (maybeCode) {
      if (/^(RINC|REXC|GRO1|GRO2|ERAB)$/i.test(maybeCode)) {
        rptCode = maybeCode;
      } else {
        requirementDesignation = maybeCode;
      }
    }
  
    return {
      term,
      subject,
      catalogNumber,
      courseCode: `${subject} ${catalogNumber}`,
      title,
      grade,
      units,
      rptCode,
      requirementDesignation,
      creditType,
      attemptStatus: creditType === 'IP' ? 'in_progress' : 'completed'
    };
  }

function parseAvailableOptions(lines, startIndex) {
  const options = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i];
    if (
      isBlank(line) ||
      isRequirementHeader(line) ||
      /^(Satisfied|Not Satisfied):/.test(line) ||
      /^·\s*(Courses|Units|GPA):/.test(line) ||
      isCourseTableHeader(line)
    ) {
      break;
    }

    line.split(',').map(s => s.trim()).filter(Boolean).forEach(option => options.push(option));
    i += 1;
  }

  return { options: unique(options), nextIndex: i - 1 };
}

function parseRequirements(lines) {
    const requirements = [];
    let current = null;
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
  
      if (line.includes('Course History')) {
        if (current) requirements.push(current);
        break;
      }
  
      const header = parseRequirementHeader(line);
      if (header) {
        if (current) requirements.push(current);
  
        current = {
          code: header.code,
          title: header.title,
          orderPrefix: header.orderPrefix,
          status: null,
          statusDetail: null,
          metricType: null,
          required: null,
          completed: null,
          needed: null,
          appliedCourses: [],
          availableOptions: [],
          notes: []
        };
        continue;
      }
  
      // Handle split requirement headers like:
      // "3. Theory and Writing Area Elective"
      // "(R1300/L70)"
      if (
        i + 1 < lines.length &&
        /^\(?(R\d+(?:\/L\d+)?|RG\d+)\)?$/.test(lines[i + 1]) &&
        !/^Term ?Subject ?Catalog ?Nbr/i.test(line) &&
        !/^(Satisfied|Not Satisfied):/i.test(line) &&
        !/^·\s*(Courses|Units|GPA):/i.test(line)
      ) {
        if (current) requirements.push(current);
  
        const code = lines[i + 1].replace(/[()]/g, '').trim();
        const orderMatch = line.match(/^(\d+)\.\s+/);
  
        current = {
          code,
          title: line.replace(/^\d+\.\s*/, '').trim(),
          orderPrefix: orderMatch ? Number(orderMatch[1]) : null,
          status: null,
          statusDetail: null,
          metricType: null,
          required: null,
          completed: null,
          needed: null,
          appliedCourses: [],
          availableOptions: [],
          notes: []
        };
  
        i += 1;
        continue;
      }
  
      if (!current) continue;
  
      const status = parseStatusLine(line);
      if (status) {
        current.status = status.status;
        current.statusDetail = status.detail;
        continue;
      }
  
      const metric = parseMetricLine(line);
      if (metric) {
        current.metricType = metric.metricType;
        current.required = metric.required;
        current.completed = metric.completed;
        current.needed = metric.needed;
        continue;
      }
  
      // Handle split metric lines like:
      // "· Units:"
      // "4.00 required, 0.00 completed, 4.00 needed"
      if (
        (line === '· Units:' || line === '· Courses:' || line === '· GPA:') &&
        i + 1 < lines.length
      ) {
        const combined = `${line} ${lines[i + 1]}`;
        const splitMetric = parseMetricLine(combined);
        if (splitMetric) {
          current.metricType = splitMetric.metricType;
          current.required = splitMetric.required;
          current.completed = splitMetric.completed;
          current.needed = splitMetric.needed;
          i += 1;
          continue;
        }
      }
  
      if (line === 'Courses Available') {
        const options = [];
        let j = i + 1;
  
        while (j < lines.length) {
          const next = lines[j];
  
          if (
            !next ||
            parseRequirementHeader(next) ||
            /^Term ?Subject ?Catalog ?Nbr/i.test(next) ||
            /^(Satisfied|Not Satisfied):/i.test(next) ||
            /^·\s*(Courses|Units|GPA):/i.test(next) ||
            /^\(?(R\d+(?:\/L\d+)?|RG\d+)\)?$/.test(next) ||
            /^\d+\.\s+.+$/.test(next) ||
            /^(Other Supporting Science Options I|Other Supporting Science Options II|Theory and Writing Area Elective|Systems Area Elective|Additional Elective II?)$/i.test(next)
          ) {
            break;
          }
  
          next
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .forEach(opt => options.push(opt));
  
          j++;
        }
  
        current.availableOptions = unique(options).filter(opt =>
          opt &&
          !/^\(R\d/.test(opt) &&
          !/^Other Supporting Science Options/i.test(opt) &&
          !/^Term ?Subject/i.test(opt)
        );
  
        i = j - 1;
        continue;
      }
  
      if (!/^Term ?Subject ?Catalog ?Nbr/i.test(line)) {
        const course = parseCourseRow(line);
        if (course) {
          current.appliedCourses.push(course);
          continue;
        }
      }
  
      if (!/^Term ?Subject ?Catalog ?Nbr/i.test(line)) {
        current.notes.push(line);
      }
    }
  
    return requirements;
}

function parseCourseHistory(lines) {
    const results = [];
  
    const start = lines.findIndex(line => line.includes('Course History'));
    if (start === -1) return results;
  
    let lastCourse = null;
  
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (/^Term ?Subject ?Catalog ?Nbr/i.test(line)) continue;
  
      const course = parseCourseRow(line);
      if (course) {
        results.push(course);
        lastCourse = course;
        continue;
      }
  
      if (lastCourse) {
        let m = line.match(/^Repeat Code:\s*([A-Z0-9]+)\s*-\s*(.+)$/i);
        if (m) {
          lastCourse.rptCode = m[1].trim();
          lastCourse.repeatDescription = m[2].trim();
          continue;
        }
  
        m = line.match(/^Requirement Designation:\s*([A-Z0-9]+)\s*-\s*(.+)$/i);
        if (m) {
          lastCourse.requirementDesignation = m[1].trim();
          lastCourse.requirementDesignationDescription = m[2].trim();
          continue;
        }
      }
    }
  
    return results;
}

function buildSnapshot(text) {
  const lines = cleanupLines(text);

  return {
    student: parseStudentHeader(lines),
    academicSummary: parseAcademicSummary(lines),
    unitSummary: parseUnitSummary(lines),
    requirements: parseRequirements(lines),
    courseHistory: parseCourseHistory(lines)
  };
}

module.exports = {
  buildSnapshot
};
